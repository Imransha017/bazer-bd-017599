import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getMyDropshipper, listMyImports, buildDsLink, type Dropshipper, type DropshipperProduct } from "@/lib/dropshipper";
import { useLiveCatalog } from "@/lib/live-catalog";
import { toast } from "sonner";
import { Copy, Download, MessageCircle, Facebook, QrCode, Sparkles, Link2 } from "lucide-react";

export const Route = createFileRoute("/dropshipping/marketing")({
  head: () => ({ meta: [{ title: "Marketing tools — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: MarketingPage,
});

const CAPTIONS_BN = [
  "🔥 নতুন কালেকশন লঞ্চ হলো! সীমিত স্টক, আজই অর্ডার করুন। 🚚 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।",
  "💥 আমাদের বেস্ট সেলিং প্রোডাক্ট! ১০০% অরিজিনাল, ৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি।",
  "🎁 আজকের বিশেষ অফার! লিংকে ক্লিক করে অর্ডার করুন আর পেয়ে যান ফ্রি হোম ডেলিভারি।",
];
const CAPTIONS_EN = [
  "🔥 New collection is live! Grab yours before stock ends. 🚚 Cash on Delivery nationwide.",
  "💥 Our best seller — 100% original, 7-day easy replacement. Order now!",
  "🎁 Today's exclusive deal — free home delivery on your order. Tap the link.",
];
const HASHTAGS = "#bangladesh #onlineshopping #cashondelivery #shopping #dhaka #bd #newarrival #trending";

function MarketingPage() {
  const [ds, setDs] = useState<Dropshipper | null>(null);
  const [imports, setImports] = useState<DropshipperProduct[]>([]);
  const { products } = useLiveCatalog();
  const [selected, setSelected] = useState<string>("");
  const [utmSrc, setUtmSrc] = useState("facebook");
  const [utmCampaign, setUtmCampaign] = useState("");

  useEffect(() => { getMyDropshipper().then(async d => { setDs(d); if (d) setImports(await listMyImports(d.id)); }); }, []);

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  if (!ds) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const buildUrl = (path?: string) => {
    const base = buildDsLink(ds.store_slug);
    const url = new URL(path ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : base);
    if (utmSrc) url.searchParams.set("utm_source", utmSrc);
    if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
    url.searchParams.set("utm_medium", "dropshipper");
    return url.toString();
  };

  const currentUrl = buildUrl(selected ? `?p=${selected}` : undefined);
  const selectedProduct = selected ? productMap.get(selected) : null;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}`;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  };
  const share = (network: "wa" | "fb" | "tg") => {
    const msg = selectedProduct?.title.en ? `${selectedProduct.title.en} — ৳${imports.find(i => i.product_id === selected)?.retail_price ?? ""}\n${currentUrl}` : `Check out my store: ${currentUrl}`;
    const u = network === "wa" ? `https://wa.me/?text=${encodeURIComponent(msg)}`
      : network === "fb" ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`
      : `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(msg)}`;
    window.open(u, "_blank");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Link2 className="h-4 w-4" />Build your share link</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs">
              <span className="font-semibold">Product (optional)</span>
              <select value={selected} onChange={e => setSelected(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1.5 text-xs">
                <option value="">Whole store</option>
                {imports.map(i => {
                  const p = productMap.get(i.product_id);
                  return <option key={i.id} value={i.product_id}>{i.custom_title || p?.title.en || i.product_id.slice(0, 8)}</option>;
                })}
              </select>
            </label>
            <label className="text-xs">
              <span className="font-semibold">Source</span>
              <select value={utmSrc} onChange={e => setUtmSrc(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1.5 text-xs">
                <option value="facebook">Facebook</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="telegram">Telegram</option><option value="tiktok">TikTok</option><option value="direct">Direct</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="font-semibold">Campaign name</span>
              <input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="eid_sale_25" className="mt-1 block w-full rounded border px-2 py-1.5 text-xs" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input readOnly value={currentUrl} className="min-w-[240px] flex-1 rounded border bg-muted/40 px-2 py-1.5 font-mono text-[11px]" />
            <button onClick={() => copy(currentUrl)} className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Copy className="h-3.5 w-3.5" />Copy</button>
            <button onClick={() => share("wa")} className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs font-bold text-white"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</button>
            <button onClick={() => share("fb")} className="inline-flex items-center gap-1 rounded bg-blue-700 px-3 py-1.5 text-xs font-bold text-white"><Facebook className="h-3.5 w-3.5" />Facebook</button>
            <button onClick={() => share("tg")} className="rounded bg-sky-500 px-3 py-1.5 text-xs font-bold text-white">Telegram</button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4" />Ready-to-post captions</h3>
          <p className="mb-2 text-[11px] text-muted-foreground">Tap any caption to copy. The link and hashtags are appended.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Bangla</p>
              <div className="space-y-1.5">
                {CAPTIONS_BN.map((c, i) => (
                  <button key={i} onClick={() => copy(`${c}\n\n${currentUrl}\n\n${HASHTAGS}`)} className="block w-full rounded border bg-muted/30 p-2 text-left text-xs hover:bg-muted">{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">English</p>
              <div className="space-y-1.5">
                {CAPTIONS_EN.map((c, i) => (
                  <button key={i} onClick={() => copy(`${c}\n\n${currentUrl}\n\n${HASHTAGS}`)} className="block w-full rounded border bg-muted/30 p-2 text-left text-xs hover:bg-muted">{c}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selectedProduct && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-bold">Product creatives</h3>
            <div className="flex flex-wrap gap-2">
              {(selectedProduct.gallery?.length ? selectedProduct.gallery : [selectedProduct.image]).filter(Boolean).map((g, i) => (
                <a key={i} href={g!} download target="_blank" rel="noreferrer" className="group relative">
                  <img src={g!} alt="" className="h-24 w-24 rounded border object-cover" />
                  <span className="absolute inset-0 hidden items-center justify-center rounded bg-black/50 text-[10px] font-bold text-white group-hover:flex"><Download className="mr-1 h-3 w-3" />Save</span>
                </a>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Right-click / long-press images to save to your device for posting.</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <h3 className="mb-2 flex items-center justify-center gap-2 text-sm font-bold"><QrCode className="h-4 w-4" />Scan-to-visit QR code</h3>
          <img src={qrUrl} alt="QR" className="mx-auto h-56 w-56 rounded border bg-white" />
          <a href={qrUrl} download="store-qr.png" className="mt-2 inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Download className="h-3.5 w-3.5" />Download QR</a>
          <p className="mt-2 text-[10px] text-muted-foreground">Print on flyers, business cards, or gift receipts.</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-1 text-sm font-bold">WhatsApp broadcast template</h3>
          <textarea
            readOnly
            value={`আসসালামু আলাইকুম!\n\nআমাদের নতুন কালেকশন দেখুন — ${currentUrl}\n\n✅ ক্যাশ অন ডেলিভারি\n✅ ৭ দিনের রিপ্লেসমেন্ট\n📞 যোগাযোগ: ${ds.whatsapp || ds.phone}`}
            className="mt-1 h-40 w-full rounded border bg-muted/30 p-2 text-xs"
          />
          <button
            onClick={() => copy(`আসসালামু আলাইকুম!\n\nআমাদের নতুন কালেকশন দেখুন — ${currentUrl}\n\n✅ ক্যাশ অন ডেলিভারি\n✅ ৭ দিনের রিপ্লেসমেন্ট\n📞 যোগাযোগ: ${ds.whatsapp || ds.phone}`)}
            className="mt-2 w-full rounded bg-green-600 py-1.5 text-xs font-bold text-white">Copy broadcast text</button>
        </div>
      </div>
    </div>
  );
}
