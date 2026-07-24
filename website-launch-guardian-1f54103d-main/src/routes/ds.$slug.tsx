import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { getPublicStore, setDsCode, trackDsClick, type Dropshipper, type DropshipperProduct } from "@/lib/dropshipper";
import { useCart } from "@/lib/cart";
import { ShoppingCart, Store } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/ProductImage";

type StoreProduct = { id: string; name: string; price: number; image?: string; description?: string };
type Item = DropshipperProduct & { product?: StoreProduct };

export const Route = createFileRoute("/ds/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Bazar BD Dropshipping Store` },
      { name: "description", content: `Shop from ${params.slug} — a Bazar BD dropshipping partner store.` },
    ],
  }),
  component: PublicStore,
});

function PublicStore() {
  const { slug } = Route.useParams();
  const [data, setData] = useState<{ ds: Dropshipper; items: Item[] } | null | undefined>(undefined);
  const { add } = useCart();

  useEffect(() => {
    getPublicStore(slug).then(d => setData(d as { ds: Dropshipper; items: Item[] } | null));
  }, [slug]);


  useEffect(() => {
    if (data?.ds?.code) {
      setDsCode(data.ds.code, 30);
      void trackDsClick(data.ds.code);
    }
  }, [data]);

  if (data === undefined) return <SiteLayout><div className="p-16 text-center text-sm text-muted-foreground">Loading store…</div></SiteLayout>;
  if (!data) return <SiteLayout><div className="p-16 text-center"><h1 className="text-xl font-bold">Store not found</h1><p className="mt-2 text-sm text-muted-foreground">This store may be pending approval or has been removed.</p></div></SiteLayout>;

  const { ds, items } = data;

  const addProduct = (item: Item) => {
    if (!item.product) return;
    const retail = Number(item.retail_price);
    add({
      id: item.product.id,
      slug: undefined,
      title: { bn: item.custom_title || item.product.name, en: item.custom_title || item.product.name },
      price: retail,
      mrp: retail,
      rating: 0,
      sold: 0,
      category: "",
      brand: "",
      sku: "",
      tags: [],
      image: item.product.image || "",
      gallery: item.product.image ? [item.product.image] : [],
      description: { bn: item.custom_description || item.product.description || "", en: item.custom_description || item.product.description || "" },
    }, 1);
    toast.success("Added to cart");
  };

  return (
    <SiteLayout>
      {ds.banner_url && <div className="h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url(${ds.banner_url})` }} />}
      <div className="mx-auto max-w-6xl p-3 sm:p-5">
        <div className="mb-4 flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {ds.logo_url ? <img src={ds.logo_url} alt="" className="h-full w-full rounded-full object-cover" /> : <Store className="h-8 w-8 text-primary" />}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold">{ds.store_name}</h1>
            {ds.bio && <p className="mt-1 text-sm text-muted-foreground">{ds.bio}</p>}
            <p className="mt-1 text-[11px] text-muted-foreground">{items.length} products · Bazar BD partner store</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">This store hasn't added any products yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map(i => (
              <div key={i.id} className="rounded-lg border bg-card p-2">
                <div className="aspect-square overflow-hidden rounded bg-muted">
                  {i.product?.image && <ProductImage src={i.product.image} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-medium">{i.custom_title || i.product?.name}</p>
                <p className="text-sm font-extrabold text-yellow-500">৳{Number(i.retail_price).toFixed(0)}</p>
                <button onClick={() => addProduct(i)} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-[11px] font-bold text-primary-foreground">
                  <ShoppingCart className="h-3 w-3" />Add to cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
