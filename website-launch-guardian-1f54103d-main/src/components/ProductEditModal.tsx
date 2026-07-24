import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Sparkles, X, Upload, Tag, Info, Image as ImageIcon, DollarSign, Palette, ListChecks, Truck, Globe, Package, Video, Star, Trash2, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage, type DBProduct, type ProductColor, type ProductVariant, type ProductSpec } from "@/lib/admin-api";
import { ProductImage } from "@/components/ProductImage";

export const emptyProduct: Partial<DBProduct> = {
  name: "", description: "", short_description: "", price: 0, original_price: null,
  discount_percent: null, image: "", gallery: [], video_url: "",
  category_slug: "", subcategory_slug: "", brand: "", sku: "", badge: "",
  stock: 0, weight: null, warranty: "", return_days: 7,
  free_shipping: false, cod_available: true,
  tags: [], colors: [], sizes: [], variants: [], specifications: [],
  meta_title: "", meta_description: "",
  is_active: true, is_featured: false,
};

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
  pricing:  { label: "Pricing",  icon: DollarSign, from: "from-emerald-500",to: "to-teal-500",     ring: "ring-emerald-300",tint: "bg-emerald-50 border-emerald-200",desc: "Price, discount, stock & offer window" },
  variants: { label: "Variants", icon: Palette,    from: "from-purple-500",    to: "to-rose-500",     ring: "ring-purple-300",    tint: "bg-purple-50 border-purple-200",       desc: "Colors, sizes & per-variant pricing" },
  specs:    { label: "Specs",    icon: ListChecks, from: "from-violet-500", to: "to-purple-500",   ring: "ring-violet-300", tint: "bg-violet-50 border-violet-200", desc: "Key/value specifications table" },
  shipping: { label: "Shipping", icon: Truck,      from: "from-amber-500",  to: "to-yellow-500",   ring: "ring-amber-300",  tint: "bg-amber-50 border-amber-200",   desc: "Weight, warranty, returns & COD" },
  seo:      { label: "SEO",      icon: Globe,      from: "from-cyan-500",   to: "to-blue-500",     ring: "ring-cyan-300",   tint: "bg-cyan-50 border-cyan-200",     desc: "Meta title, description & URL slug" },
};

export function ProductEditModal({ item, setItem, onSave, onClose, hideFeatured = false, categories }: {
  item: Partial<DBProduct>;
  setItem: (p: Partial<DBProduct>) => void;
  onSave: (nextItem?: Partial<DBProduct>) => void;
  onClose: () => void;
  hideFeatured?: boolean;
  categories?: Array<{ slug: string; name: string }>;
}) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<TabKey>("basic");
  const [tagInput, setTagInput] = useState("");
  const [sizeInput, setSizeInput] = useState("");
  const [dropPriceUnlocked, setDropPriceUnlocked] = useState(false);
  // Always re-lock when a different product is opened/closed
  useEffect(() => { setDropPriceUnlocked(false); }, [item?.id]);

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
    const stockRaw = item.stock;
    const isAlways = typeof stockRaw === "number" && stockRaw >= ALWAYS_IN_STOCK;
    if (!isAlways) {
      if (stockRaw === null || stockRaw === undefined || Number.isNaN(Number(stockRaw))) {
        toast.error("Stock number দিন অথবা 'In stock' মোড সিলেক্ট করুন");
        return;
      }
      if (Number(stockRaw) < 0) {
        toast.error("Stock number ০ বা তার বেশি হতে হবে");
        return;
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
              {!hideFeatured && (
                <Field label="⭐ Featured"><select value={item.is_featured ? "1" : "0"} onChange={(e) => setItem({ ...item, is_featured: e.target.value === "1" })} className="input"><option value="0">No</option><option value="1">Yes — show on homepage</option></select></Field>
              )}
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
              <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                <div className="text-xs font-bold text-emerald-800">💰 Selling Price</div>
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
                    onClick={() => setDropPriceUnlocked(v => !v)}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-rose-800">🔥 Discount & Offer Window</div>
                  {(() => {
                    const s = Number(item.stock ?? 0);
                    const cls = s >= ALWAYS_IN_STOCK ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : s <= 0 ? "bg-red-100 text-red-800 border-red-300"
                      : "bg-amber-100 text-amber-800 border-amber-300";
                    const label = s >= ALWAYS_IN_STOCK ? "♾️ In Stock" : s <= 0 ? "❌ Out of Stock" : `🔢 Stock: ${s}`;
                    return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
                  })()}
                </div>

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
              <Field label="💵 Cash on Delivery"><select value={(item.cod_available ?? true) ? "1" : "0"} onChange={(e) => setItem({ ...item, cod_available: e.target.value === "1" })} className="input"><option value="1">Yes</option><option value="0">No</option></select></Field>
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
          <div className="hidden text-xs text-slate-500 sm:block">⚡ Changes save instantly.</div>
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

type DBCatRow = { id: string; name: string; slug: string; parent_id: string | null };
const splitSlugs = (v?: string | null) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const joinSlugs = (arr: string[]) => Array.from(new Set(arr)).join(",");

function CategoryPicker({ item, setItem }: { item: Partial<DBProduct>; setItem: (p: Partial<DBProduct>) => void }) {
  const [cats, setCats] = useState<DBCatRow[]>([]);
  const [mode, setMode] = useState<"single" | "multi">(() =>
    splitSlugs(item.category_slug).length > 1 ||
    splitSlugs(item.subcategory_slug).length > 1 ||
    splitSlugs((item as any).option_slug).length > 1 ? "multi" : "single"
  );
  useEffect(() => {
    supabase.from("categories").select("id,name,slug,parent_id")
      .order("sort_order", { ascending: true }).order("name", { ascending: true })
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
    } as Partial<DBProduct>);
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
    } as Partial<DBProduct>);
  };
  const setOptions = (slugs: string[]) => {
    const names = availableOpts.filter((o) => slugs.includes(o.slug)).map((o) => o.name);
    setItem({ ...item, option_slug: joinSlugs(slugs), option_name: names.join(", ") } as Partial<DBProduct>);
  };
  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/70 to-indigo-50/50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-purple-800">🗂️ Category, Subcategory & Option</div>
        <div className="inline-flex rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-purple-200">
          <button type="button" onClick={() => { setMode("single"); setCategories(selectedCatSlugs.slice(0, 1)); setSubcategories(selectedSubSlugs.slice(0, 1)); setOptions(selectedOptSlugs.slice(0, 1)); }}
            className={`rounded-md px-3 py-1 text-[11px] font-bold transition ${mode === "single" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}>Single</button>
          <button type="button" onClick={() => setMode("multi")}
            className={`rounded-md px-3 py-1 text-[11px] font-bold transition ${mode === "multi" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}>Multiple</button>
        </div>
      </div>

      {mode === "single" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Category *">
            <select value={selectedCatSlugs[0] ?? ""} onChange={(e) => setCategories(e.target.value ? [e.target.value] : [])} className="input">
              <option value="">— Select category —</option>
              {parents.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Subcategory">
            <select value={selectedSubSlugs[0] ?? ""} onChange={(e) => setSubcategories(e.target.value ? [e.target.value] : [])}
              disabled={selectedParents.length === 0} className="input disabled:opacity-50">
              <option value="">— {selectedParents.length ? "Select subcategory" : "Choose a category first"} —</option>
              {availableSubs.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Option">
            <select value={selectedOptSlugs[0] ?? ""} onChange={(e) => setOptions(e.target.value ? [e.target.value] : [])}
              disabled={selectedSubs.length === 0 || availableOpts.length === 0} className="input disabled:opacity-50">
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

export const ALWAYS_IN_STOCK = 999999;
export function StockField({ value, onChange }: { value: number | null | undefined; onChange: (v: number | null) => void }) {
  const always = typeof value === "number" && value >= ALWAYS_IN_STOCK;
  const empty = value === null || value === undefined || Number.isNaN(value as number);
  return (
    <div className="rounded-lg border border-rose-200 bg-white/70 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-rose-800">Stock</span>
        <div className="inline-flex overflow-hidden rounded-full border border-rose-200 bg-white text-[10px] font-bold">
          <button type="button" onClick={() => onChange(ALWAYS_IN_STOCK)} className={`px-2.5 py-1 ${always ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>In stock</button>
          <button type="button" onClick={() => onChange(always ? null : (value ?? null))} className={`px-2.5 py-1 ${!always ? "bg-rose-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Stock number</button>
        </div>
      </div>
      {always ? (
        <div className="rounded bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-700">✓ Always in stock — no quantity limit</div>
      ) : (
        <input
          type="number"
          min={0}
          value={empty ? "" : (value as number)}
          onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, +e.target.value || 0))}
          className={`input ${empty ? "border-red-400 ring-1 ring-red-300" : ""}`}
          placeholder="Available quantity"
          required
        />
      )}
      {!always && empty && (
        <div className="mt-1 text-[10px] font-bold text-red-600">⚠ Stock number দিন (অথবা 'In stock' সিলেক্ট করুন)</div>
      )}
      {!always && !empty && (value as number) <= 0 && (
        <div className="mt-1 text-[10px] font-bold text-red-600">⚠ Out of stock</div>
      )}
    </div>
  );
}



