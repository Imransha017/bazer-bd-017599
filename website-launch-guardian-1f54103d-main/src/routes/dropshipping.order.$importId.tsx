import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyImportWithProduct, getMyDropshipper, attributeOrderToDs, type ImportWithProduct } from "@/lib/dropshipper";
import { createDBOrder } from "@/lib/admin-api";
import { BD_DISTRICTS, BD_LOCATIONS } from "@/lib/bd-locations";
import { ArrowLeft, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dropshipping/order/$importId")({
  head: () => ({ meta: [{ title: "Place Order — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
});

const MERCHANT = "01759968476";
const WALLET_META: Record<string, { label: string; brand: string }> = {
  bkash: { label: "bKash", brand: "#e2136e" },
  nagad: { label: "Nagad", brand: "#ec1c24" },
  rocket: { label: "Rocket", brand: "#8a338a" },
};

function OrderPage() {
  const { importId } = Route.useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ImportWithProduct | null | undefined>(undefined);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [qty, setQty] = useState(1);
  const [sellPrice, setSellPrice] = useState("");
  const [payment, setPayment] = useState<"cod" | "bkash" | "nagad" | "rocket">("cod");
  const [payOption, setPayOption] = useState<"full" | "delivery">("full");
  const [txnId, setTxnId] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selSize, setSelSize] = useState("");
  const [selColor, setSelColor] = useState("");
  const [selVariant, setSelVariant] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyImportWithProduct(importId).then(d => {
      setData(d);
      if (d) setSellPrice(String(Number(d.imp.retail_price)));
    });
    try {
      const raw = sessionStorage.getItem("ds_order_selection");
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.importId === importId) {
          if (s.qty) setQty(Math.max(1, Number(s.qty)));
          if (s.selSize) setSelSize(s.selSize);
          if (s.selColor) setSelColor(s.selColor);
          if (s.selVariant) setSelVariant(s.selVariant);
        }
      }
    } catch { /* ignore */ }
  }, [importId]);

  if (data === undefined) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-10 text-center"><p className="text-lg font-bold">Product not found</p><Link to="/dropshipping/products" className="mt-3 inline-block text-sm text-primary">← Back</Link></div>;

  const { imp, product: p } = data;
  const base = Number(p.price || 0);
  const sell = Number(sellPrice) || 0;
  const selColorObj = selColor ? p.colors?.find(c => c.name === selColor) : undefined;
  const selVariantObj = selVariant ? p.variants?.find(v => v.name === selVariant) : undefined;
  const variantExtra = Number(selVariantObj?.price || 0);
  const effSku = selVariantObj?.sku || selColorObj?.sku || p.sku || "";
  const effStockRaw = selVariantObj?.stock ?? selColorObj?.stock ?? p.stock ?? 0;
  const effStock = Number(effStockRaw);
  const isAlwaysInStock = effStock >= 999999;
  const effImage = selVariantObj?.image || selColorObj?.image || p.image || "";
  const shipping = district.trim().toLowerCase() === "dhaka" ? 70 : 120;
  const subtotal = (sell + variantExtra) * qty;
  const total = subtotal + shipping;
  const profit = Math.max(0, sell - base) * qty;
  const isWallet = payment !== "cod";
  const walletAmount = isWallet ? (payOption === "full" ? total : shipping) : 0;

  const hasSizes = (p.sizes?.length || 0) > 0;
  const hasColors = (p.colors?.length || 0) > 0;
  const hasVariants = (p.variants?.length || 0) > 0;

  const submit = async () => {
    if (!customerName.trim() || !/^01[3-9]\d{8}$/.test(phone.trim())) return toast.error("Valid customer name & phone required");
    if (!address.trim() || !district.trim()) return toast.error("Delivery address & district required");
    if (hasSizes && !selSize) return toast.error("Please select a size");
    if (hasColors && !selColor) return toast.error("Please select a color");
    if (hasVariants && !selVariant) return toast.error("Please select a variant");
    if (sell < base) return toast.error(`Sell price must be at least ৳${base}`);
    if (!isAlwaysInStock) {
      if (effStock <= 0) return toast.error("Selected option is out of stock");
      if (qty > effStock) return toast.error(`Only ${effStock} in stock for this option`);
    }
    if (isWallet) {
      if (!/^[A-Z0-9]{6,20}$/i.test(txnId.trim())) return toast.error("Enter a valid transaction ID");
      if (!/^01[3-9]\d{8}$/.test(senderPhone.trim())) return toast.error(`Enter the ${WALLET_META[payment].label} number you paid from`);
    }
    setBusy(true);
    try {
      const itemName = `${imp.custom_title || p.name}${selVariant ? ` — ${selVariant}` : ""}${selSize ? ` / Size: ${selSize}` : ""}${selColor ? ` / Color: ${selColor}` : ""}`;
      const row = await createDBOrder({
        customer_name: customerName.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || undefined,
        address: address.trim(),
        district: district.trim(),
        thana: thana.trim(),
        items: [{
          id: imp.product_id, name: itemName, price: sell + variantExtra, qty,
          image: effImage,
          sku: effSku || undefined,
          size: selSize || undefined,
          color: selColor || undefined,
          variant: selVariant || undefined,
        }],
        subtotal, delivery_fee: shipping, total,
        payment_method: payment,
        payment_type: isWallet ? payOption : undefined,
        txn_id: isWallet ? txnId.trim().toUpperCase() : undefined,
        sender_phone: isWallet ? senderPhone.trim() : undefined,
        paid_amount: isWallet ? walletAmount : undefined,
        notes: notes.trim() || undefined,
        vendor_id: p.vendor_id ?? null,
      });
      if (row?.id) {
        const ds = await getMyDropshipper();
        if (ds) await attributeOrderToDs(row.id, ds.code, [{ product_id: imp.product_id, base_price: base, retail_price: sell, qty }]);
        toast.success(`Order placed: ${row.order_number}`);
        navigate({ to: "/dropshipping/order-confirmation/$orderId", params: { orderId: row.id } });
      } else {
        toast.error("Order failed");
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-gradient-to-b from-sky-50/60 via-background to-background dark:from-sky-950/20">
      <div className="mx-auto max-w-6xl px-2 py-3 pb-24 md:px-4">
        <div className="mb-3 flex items-center gap-2">
          <Link to="/dropshipping/view/$importId" params={{ importId }} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" />Back to product</Link>
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-pink-500 to-purple-600 px-4 py-3 text-white shadow">
          <Truck className="h-5 w-5" />
          <div>
            <p className="text-sm font-extrabold">Dropshipper Order</p>
            <p className="text-[11px] opacity-90">Place an order on behalf of your customer. Profit is credited to your wallet on delivery.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          {/* Form */}
          <div className="space-y-4">
            {/* Product summary */}
            <div className="flex gap-3 rounded-xl border bg-card p-3 shadow-sm">
              {effImage && <img src={effImage} alt="" className="h-20 w-20 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-bold">{imp.custom_title || p.name}</p>
                <p className="text-[11px] text-muted-foreground">Base ৳{base.toFixed(0)} · Your listed ৳{Number(imp.retail_price).toFixed(0)}</p>
                <p className="text-[11px] text-muted-foreground">
                  SKU: <span className="font-semibold text-foreground">{effSku || "—"}</span> · Stock: <span className={`font-semibold ${!isAlwaysInStock && effStock <= 0 ? "text-red-600" : "text-foreground"}`}>{isAlwaysInStock ? "In stock" : effStock > 0 ? effStock : "Out of stock"}</span>
                </p>
                <div className="mt-1 flex gap-3 text-[11px]">
                  <label className="flex items-center gap-1">
                    <span className="font-semibold">Sell ৳</span>
                    <input type="number" min={base} value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="w-20 rounded border px-2 py-1 text-xs font-bold" />
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="font-semibold">Qty</span>
                    <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-16 rounded border px-2 py-1 text-xs" />
                  </label>
                </div>
              </div>
            </div>

            {/* Options */}
            {(hasSizes || hasColors || hasVariants) && (
              <div className="rounded-xl border bg-amber-50/50 p-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Product options</p>
                {hasSizes && (
                  <div>
                    <span className="text-[11px] font-semibold">Size *</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.sizes!.map(s => (
                        <button type="button" key={s} onClick={() => setSelSize(s)} className={`rounded border px-3 py-1 text-xs font-bold ${selSize === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {hasColors && (
                  <div>
                    <span className="text-[11px] font-semibold">Color *</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {p.colors!.map(c => (
                        <button type="button" key={c.name} onClick={() => setSelColor(c.name)} className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${selColor === c.name ? "border-primary ring-2 ring-primary" : "border-border hover:bg-muted"}`}>
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
                    <select value={selVariant} onChange={e => setSelVariant(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background">
                      <option value="">Select variant…</option>
                      {p.variants!.map(v => <option key={v.name} value={v.name}>{v.name}{v.price ? ` (+৳${v.price})` : ""}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Customer details */}
            <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Customer details</p>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" className="w-full rounded-md border px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (01XXXXXXXXX)" className="rounded-md border px-3 py-2 text-sm" />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" type="email" className="rounded-md border px-3 py-2 text-sm" />
              </div>
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
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>

            {/* Payment */}
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment method</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(["cod", "bkash", "nagad", "rocket"] as const).map(m => (
                  <button type="button" key={m} onClick={() => setPayment(m)} className={`rounded-md border px-2 py-2 text-xs font-bold ${payment === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {m === "cod" ? "Cash on Delivery" : WALLET_META[m].label}
                  </button>
                ))}
              </div>
              {isWallet && (
                <div className="mt-3 rounded-md border p-3 space-y-2" style={{ borderColor: WALLET_META[payment].brand }}>
                  <p className="text-xs font-bold" style={{ color: WALLET_META[payment].brand }}>
                    {WALLET_META[payment].label} — Send Money to <span className="font-extrabold text-foreground">{MERCHANT}</span>
                  </p>
                  <div className="flex gap-2 text-xs">
                    {(["full", "delivery"] as const).map(o => (
                      <label key={o} className={`flex flex-1 cursor-pointer items-center gap-1.5 rounded border px-2 py-1.5 ${payOption === o ? "border-primary bg-primary/5" : "border-border"}`}>
                        <input type="radio" checked={payOption === o} onChange={() => setPayOption(o)} className="size-3 accent-primary" />
                        <span>{o === "full" ? `Full ৳${total.toFixed(0)}` : `Advance ৳${shipping} (delivery only)`}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Send <b>৳{walletAmount.toFixed(0)}</b> to <b>{MERCHANT}</b>, then fill below.</p>
                  <input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="Transaction ID" className="w-full rounded border px-2 py-1.5 text-xs uppercase" />
                  <input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder={`${WALLET_META[payment].label} number you paid from`} className="w-full rounded border px-2 py-1.5 text-xs" />
                </div>
              )}
            </div>
          </div>

          {/* Summary sidebar */}
          <aside className="lg:sticky lg:top-4 h-fit space-y-3">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Order summary</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Sell × Qty</span><span>৳{(sell + variantExtra).toFixed(0)} × {qty}</span></div>
                <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">৳{subtotal.toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span className="font-bold">৳{shipping}</span></div>
                <div className="mt-2 flex justify-between border-t pt-2 text-base"><span className="font-bold">Customer pays</span><span className="font-extrabold text-primary">৳{total.toFixed(0)}</span></div>
              </div>
              <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs">
                <div className="flex justify-between"><span>Your profit</span><span className="font-extrabold text-emerald-700">৳{profit.toFixed(0)}</span></div>
              </div>
              <button onClick={submit} disabled={busy} className="mt-4 w-full rounded-md bg-gradient-to-r from-sky-500 via-pink-500 to-purple-600 py-3 text-sm font-extrabold text-white shadow disabled:opacity-60">
                <ShoppingCart className="mr-1 inline h-4 w-4" />{busy ? "Placing order…" : "Place order"}
              </button>
              <p className="mt-2 text-[10px] text-muted-foreground">By placing this order you confirm the customer info is correct.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
