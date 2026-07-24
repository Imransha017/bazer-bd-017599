import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/site/Layout";
import { useCart } from "@/lib/cart";
import { useOrders, type PaymentMethod, type ShippingAddress } from "@/lib/orders";
import { formatBDT } from "@/lib/data";
import { toast } from "sonner";
import { MapPin, Truck, Tag, ChevronRight, ShieldCheck, Check, MessageSquare, CalendarClock, Store, Undo2, BookUser } from "lucide-react";
import { BD_DISTRICTS, BD_LOCATIONS } from "@/lib/bd-locations";
import { SearchableSelect } from "@/components/SearchableSelect";
import { validateCheckout } from "@/lib/checkout.functions";
import { validateCoupon } from "@/lib/coupons";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useLiveStock, stockStatus, rawProductId } from "@/lib/useLiveStock";

const addressSchema = z.object({
  fullName: z.string().trim().min(3, "Full name must be at least 3 characters").max(80),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/, "Enter a valid BD phone (e.g. 01XXXXXXXXX)"),
  region: z.string().trim().min(1, "Select a district"),
  city: z.string().trim().min(1, "Select a thana / upazila"),
  address: z.string().trim().min(5, "Delivery full address must be at least 5 characters").max(200),
});

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Bazar" }] }),
  component: CheckoutPage,
});



import bkashLogo from "@/assets/pay-bkash.png";
import nagadLogo from "@/assets/pay-nagad.png";
import rocketLogo from "@/assets/pay-rocket.png";
import { ProductImage } from "@/components/ProductImage";

const PAYMENTS: { id: PaymentMethod; label: string; desc: string; logo: string; img?: string; brand?: string }[] = [
  { id: "cod", label: "Cash on Delivery", desc: "Pay when you receive", logo: "💵" },
  { id: "bkash", label: "bKash", desc: "Send Money to 01759968476", logo: "🅱️", img: bkashLogo, brand: "#e2136e" },
  { id: "nagad", label: "Nagad", desc: "Send Money to 01759968476", logo: "🅽", img: nagadLogo, brand: "#ec1c24" },
  { id: "rocket", label: "Rocket", desc: "Send Money to 01759968476", logo: "🚀", img: rocketLogo, brand: "#8a338a" },
  { id: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard, Amex", logo: "💳" },
];

const MOBILE_WALLETS: PaymentMethod[] = ["bkash", "nagad", "rocket"];
const MERCHANT_NUMBERS: Record<string, string> = {
  bkash: "01759968476",
  nagad: "01759968476",
  rocket: "01759968476",
};

function CheckoutPage() {
  const cart = useCart();
  const [mounted, setMounted] = useState(false);
  const [buyNow, setBuyNow] = useState<{ items: typeof cart.items } | null>(null);
  useEffect(() => {
    setMounted(true);
    try {
      const raw = sessionStorage.getItem("buy_now");
      if (raw) setBuyNow(JSON.parse(raw));
    } catch {}
  }, []);
  const { user: authUser, loading: authLoading } = useAuth();
  useEffect(() => {
    if (!mounted || authLoading) return;
    if (buyNow) return; // Order Now flow: no account required
    if (!authUser) {
      import("sonner").then(({ toast }) => toast.error("কার্ট থেকে অর্ডার করতে সাইন ইন করুন"));
      try { sessionStorage.setItem("post_login_redirect", "/checkout"); } catch {}
      window.location.href = "/auth";
    }
  }, [mounted, authLoading, authUser, buyNow]);
  const items = buyNow ? buyNow.items : cart.items;
  const subtotal = buyNow
    ? buyNow.items.reduce((s, x) => s + x.product.price * x.qty, 0)
    : cart.subtotal;
  const clear = () => {
    if (buyNow) { try { sessionStorage.removeItem("buy_now"); } catch {} }
    else cart.clear();
  };
  const { placeOrder } = useOrders();
  const navigate = useNavigate();
  const verifyCheckout = useServerFn(validateCheckout);

  const { user } = useAuth();
  const [savedAddrs, setSavedAddrs] = useState<Array<{ id: string; label: string | null; full_name: string; phone: string; district: string; thana: string; address: string; is_default: boolean }>>([]);

  const [addr, setAddr] = useState<ShippingAddress>({
    fullName: "", phone: "", region: "", city: "", address: "",
  });
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [voucher, setVoucher] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [payOption, setPayOption] = useState<"full" | "delivery">("full");
  const [txnId, setTxnId] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [walletErrors, setWalletErrors] = useState<{ txnId?: string; senderPhone?: string }>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).then(({ data }) => {
      if (!data?.length) return;
      setSavedAddrs(data);
      const def = data.find((a) => a.is_default) ?? data[0];
      setAddr({ fullName: def.full_name, phone: def.phone, region: def.district, city: def.thana, address: def.address });
    });
  }, [user]);

  const today = new Date();
  const isDhaka = addr.region === "Dhaka";
  const etaStart = new Date(today); etaStart.setDate(today.getDate() + (isDhaka ? 1 : 3));
  const etaEnd = new Date(today); etaEnd.setDate(today.getDate() + (isDhaka ? 2 : 4));
  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const eta = isDhaka ? `${fmtDate(etaStart)} – ${fmtDate(etaEnd)} (within 24h)` : `${fmtDate(etaStart)} – ${fmtDate(etaEnd)}`;

  const originalTotal = items.reduce((s, x) => s + ((x.product as { mrp?: number }).mrp ?? x.product.price) * x.qty, 0);
  const itemSavings = Math.max(0, originalTotal - subtotal);
  const totalSavings = itemSavings + (discount || 0);
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});
  const [stockError, setStockError] = useState<string[] | null>(null);

  const hasRegion = !!addr.region;
  const shippingFee = hasRegion ? (addr.region === "Dhaka" ? 70 : 120) : 0;
  const codFee = 0;
  const total = Math.max(0, subtotal + shippingFee - discount);
  const coinsEarn = Math.floor(total / 100);

  const stockIds = Array.from(new Set(items.map((i) => rawProductId(i.product.id))));
  const liveStocks = useLiveStock(stockIds);
  const stockIssues = items
    .map((it) => {
      const pid = rawProductId(it.product.id);
      const live = liveStocks[pid];
      if (live === undefined) return null;
      const info = stockStatus(live);
      if (info.outOfStock) return { pid, title: it.product.title.en, kind: "out" as const, available: 0 };
      if (!info.permanent && it.qty > live) return { pid, title: it.product.title.en, kind: "short" as const, available: live };
      return null;
    })
    .filter(Boolean) as Array<{ pid: string; title: string; kind: "out" | "short"; available: number }>;
  const hasStockIssue = stockIssues.length > 0;

  if (!mounted) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-none px-4 py-16 text-center text-sm text-muted-foreground">Loading…</div>
      </SiteLayout>
    );
  }
  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-none px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Your cart is empty</h1>
          <Link to="/" className="mt-4 inline-block rounded bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Continue Shopping</Link>
        </div>
      </SiteLayout>
    );
  }

  const set = <K extends keyof ShippingAddress>(k: K, v: ShippingAddress[K]) => {
    setAddr((a) => ({ ...a, [k]: v }));
    setErrors((er) => (er[k] ? { ...er, [k]: undefined } : er));
  };

  const FIELD_LABELS: Record<keyof ShippingAddress, string> = {
    fullName: "Full Name", phone: "Phone Number", region: "District",
    city: "Thana / Upazila", address: "Delivery Full Address",
  };

  const validateAddress = () => {
    const result = addressSchema.safeParse(addr);
    if (!result.success) {
      const fe: Partial<Record<keyof ShippingAddress, string>> = {};
      const missing: string[] = [];
      for (const i of result.error.issues) {
        const k = i.path[0] as keyof ShippingAddress;
        if (!fe[k]) { fe[k] = i.message; missing.push(FIELD_LABELS[k]); }
      }
      setErrors(fe);
      toast.error(`Please fill: ${missing.join(", ")}`);
      const first = result.error.issues[0]?.path[0] as string;
      if (first) document.getElementById(`field-${first}`)?.focus();
      return null;
    }
    setErrors({});
    return result.data;
  };

  const applyVoucher = async () => {
    const code = voucher.trim().toUpperCase();
    if (!code) return;
    // Built-in shortcut: FREESHIP applies to delivery fee
    if (code === "FREESHIP") {
      setDiscount(shippingFee);
      setAppliedCode(code);
      toast.success("Free shipping voucher applied");
      return;
    }
    const res = await validateCoupon(code, subtotal, items.map((i) => ({ id: i.product.id, price: i.product.price, qty: i.qty })));
    if (!res.ok) {
      setDiscount(0);
      setAppliedCode(null);
      toast.error(res.error);
      return;
    }
    setDiscount(res.applied.discount);
    setAppliedCode(res.applied.code);
    toast.success(`Coupon applied: -৳${res.applied.discount}`);
  };

  const isWallet = MOBILE_WALLETS.includes(payment);
  const walletAmount = isWallet ? (payOption === "full" ? total : shippingFee) : 0;

  const validateWallet = () => {
    if (!isWallet) return true;
    const errs: { txnId?: string; senderPhone?: string } = {};
    if (!/^[A-Za-z0-9]{6,20}$/.test(txnId.trim())) errs.txnId = "Enter valid Transaction ID (6-20 chars)";
    if (!/^01[3-9]\d{8}$/.test(senderPhone.trim())) errs.senderPhone = "Enter valid 11-digit BD mobile number";
    setWalletErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(`Please complete ${PAYMENTS.find(p => p.id === payment)?.label} payment form`);
      const first = errs.txnId ? "field-txnId" : "field-senderPhone";
      document.getElementById(first)?.focus();
      return false;
    }
    return true;
  };

  const submit = async () => {
    setStockError(null);

    // 1) Live-state check (from useLiveStock cache)
    if (hasStockIssue) {
      const lines = stockIssues.map((s) =>
        s.kind === "out"
          ? `❌ "${s.title}" — Out of Stock`
          : `⚠ "${s.title}" — only ${s.available} left`
      );
      setStockError(lines);
      toast.error(lines[0] + (lines.length > 1 ? ` (+${lines.length - 1} more)` : ""));
      return;
    }
    const validated = validateAddress();
    if (!validated) return;
    if (!validateWallet()) return;
    const effectiveShipping = Math.max(0, shippingFee - (discount === shippingFee ? shippingFee : 0));
    setPlacing(true);

    // 2) Fresh authoritative stock check right before submit
    try {
      const ids = Array.from(new Set(items.map((i) => rawProductId(i.product.id))));
      const { data: fresh } = await supabase.from("products").select("id, title, stock").in("id", ids);
      const map = new Map((fresh ?? []).map((p: any) => [p.id, p]));
      const problems: string[] = [];
      for (const it of items) {
        const pid = rawProductId(it.product.id);
        const row = map.get(pid);
        if (!row) continue;
        const s = stockStatus(row.stock ?? 0);
        if (s.outOfStock) problems.push(`❌ "${row.title?.en ?? it.product.title.en}" — Out of Stock`);
        else if (!s.permanent && it.qty > (row.stock ?? 0)) problems.push(`⚠ "${row.title?.en ?? it.product.title.en}" — only ${row.stock} left`);
      }
      if (problems.length) {
        setStockError(problems);
        toast.error(problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : ""));
        setPlacing(false);
        return;
      }
    } catch {/* if fresh check fails, fall through to server verify */}

    try {
      await verifyCheckout({
        data: {
          address: validated,
          payment,
          items: items.map((i) => ({ id: i.product.id, name: i.product.title.en, price: i.product.price, qty: i.qty })),
          subtotal,
          shippingFee: effectiveShipping,
          discount: discount === shippingFee ? 0 : discount,
          total,
        },
      });
    } catch (e) {
      setPlacing(false);
      toast.error(e instanceof Error ? e.message : "Checkout validation failed");
      return;
    }
    const order = placeOrder({
      items, subtotal, shippingFee: effectiveShipping,
      total, address: validated, payment,
      ...(isWallet && {
        walletInfo: {
          type: payOption,
          amountPaid: walletAmount,
          transactionId: txnId.trim(),
          senderPhone: senderPhone.trim(),
        },
      }),
    });
    clear();
    toast.success("Order placed successfully!");
    navigate({ to: "/order/$id", params: { id: order.id } });
  };


  const fieldCls = (k: keyof ShippingAddress) =>
    `w-full rounded border px-3 py-2.5 text-sm outline-none focus:border-primary ${errors[k] ? "border-destructive bg-destructive/5" : "border-border"}`;

  

  return (
    <SiteLayout>
      <div className="min-h-screen bg-muted/40">
        <div className="mx-auto max-w-6xl px-3 py-4 md:px-4 md:py-6">
          <h1 className="mb-4 text-lg font-semibold md:text-xl">Checkout</h1>

          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {/* 1. Shipping Address */}
              <section className="rounded bg-card shadow-card">
                <header className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
                  <MapPin className="size-4 text-primary" /> Shipping Address
                </header>
                <div className="space-y-3 px-4 py-4">
                  {savedAddrs.length > 0 && (
                    <div className="rounded border border-dashed border-primary/50 bg-primary/5 p-2">
                      <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <BookUser className="size-3.5" /> Use saved address
                      </label>
                      <select
                        onChange={(e) => {
                          const a = savedAddrs.find((x) => x.id === e.target.value);
                          if (a) setAddr({ fullName: a.full_name, phone: a.phone, region: a.district, city: a.thana, address: a.address });
                        }}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                      >
                        <option value="">-- Select saved address --</option>
                        {savedAddrs.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label ?? "Address"} — {a.full_name}, {a.thana}, {a.district}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Full Name *</label>
                      <input id="field-fullName" value={addr.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Enter your full name" className={fieldCls("fullName")} />
                      {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Phone Number *</label>
                      <input id="field-phone" inputMode="numeric" maxLength={11} value={addr.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} placeholder="01XXXXXXXXX" className={fieldCls("phone")} />
                      {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">District *</label>
                      <SearchableSelect
                        id="field-region"
                        value={addr.region}
                        options={BD_DISTRICTS}
                        onChange={(v) => { set("region", v); set("city", ""); }}
                        placeholder="Select district"
                      />
                      {errors.region && <p className="mt-1 text-xs text-destructive">{errors.region}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Thana / Upazila *</label>
                      <SearchableSelect
                        id="field-city"
                        value={addr.city}
                        options={BD_LOCATIONS[addr.region] ?? []}
                        onChange={(v) => set("city", v)}
                        disabled={!addr.region}
                        disabledText="Select district first"
                        placeholder="Select thana / upazila"
                      />
                      {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-muted-foreground">Delivery Full Address *</label>
                      <textarea id="field-address" rows={2} value={addr.address} onChange={(e) => set("address", e.target.value)} placeholder="House / Road / Block / Village / Landmark" className={fieldCls("address")} />
                      {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address}</p>}
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Voucher */}

              <section className="rounded bg-card shadow-card">
                <header className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
                  <Tag className="size-4 text-primary" /> Voucher
                </header>
                <div className="flex items-center gap-2 px-4 py-3">
                  <input value={voucher} onChange={(e) => setVoucher(e.target.value)} placeholder="Enter voucher code (try BAZAR50)" className="flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-primary" />
                  <button type="button" onClick={applyVoucher} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">APPLY</button>
                </div>
              </section>

              {/* 3. Order Note */}
              <section className="rounded bg-card shadow-card">
                <header className="flex items-center gap-2 border-b px-4 py-3 font-semibold">
                  <MessageSquare className="size-4 text-primary" /> Leave a Message
                </header>
                <div className="px-4 py-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 200))}
                    rows={2}
                    placeholder="Please leave a message to the seller (optional)"
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">{note.length}/200</p>
                </div>
              </section>

              {/* 4. Payment Method */}
              <section className="rounded bg-card shadow-card">
                <header className="border-b px-4 py-3 font-semibold">Payment Method</header>
                <div className="divide-y">
                  {PAYMENTS.map((m) => (
                    <label key={m.id} className={`flex cursor-pointer items-center gap-2 px-3 py-2 ${payment === m.id ? "bg-primary/5" : ""}`}>
                      <input type="radio" name="pm" checked={payment === m.id} onChange={() => setPayment(m.id)} className="size-3.5 accent-primary" />
                      {m.img ? <img src={m.img} alt={m.label} loading="lazy" className="h-8 w-12 object-contain" /> : <span className="text-lg">{m.logo}</span>}
                      <div className="flex-1">
                        <p className="text-xs font-medium">{m.label}</p>
                        <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                      </div>
                      {payment === m.id && <Check className="size-3.5 text-primary" />}
                    </label>
                  ))}
                </div>
                {isWallet && (
                  <div className="border-t bg-muted/30 px-4 py-4">
                    <div
                      className="rounded-lg border-2 p-3"
                      style={{ borderColor: PAYMENTS.find(p => p.id === payment)?.brand }}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        {(() => { const cur = PAYMENTS.find(p => p.id === payment); return cur?.img ? <img src={cur.img} alt={cur.label} loading="lazy" className="h-14 w-20 object-contain" /> : <span className="text-2xl">{cur?.logo}</span>; })()}
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: PAYMENTS.find(p => p.id === payment)?.brand }}>
                            {PAYMENTS.find(p => p.id === payment)?.label} Payment
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Send Money to: <span className="font-semibold text-foreground">{MERCHANT_NUMBERS[payment]}</span>
                          </p>
                        </div>
                      </div>

                      <p className="mb-1.5 text-xs font-semibold">Payment Option *</p>
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {([
                          { id: "full" as const, label: "Full Payment", amt: total },
                          { id: "delivery" as const, label: "Delivery Charge Only", amt: shippingFee },
                        ]).map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex cursor-pointer flex-col rounded border-2 px-3 py-2 text-xs ${payOption === opt.id ? "border-primary bg-primary/5" : "border-border"}`}
                          >
                            <span className="flex items-center gap-1.5 font-medium">
                              <input
                                type="radio"
                                name="payOpt"
                                checked={payOption === opt.id}
                                onChange={() => setPayOption(opt.id)}
                                className="size-3.5 accent-primary"
                              />
                              {opt.label}
                            </span>
                            <span className="mt-0.5 pl-5 font-bold text-primary">{formatBDT(opt.amt)}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mb-2 rounded bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        Please send <span className="font-bold">{formatBDT(walletAmount)}</span> to <span className="font-bold">{MERCHANT_NUMBERS[payment]}</span> then fill the form below.
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] text-muted-foreground">Transaction ID (TrxID) *</label>
                          <input
                            id="field-txnId"
                            value={txnId}
                            onChange={(e) => { setTxnId(e.target.value.toUpperCase()); setWalletErrors((er) => ({ ...er, txnId: undefined })); }}
                            placeholder="e.g. 9F7K2L1MNB"
                            className={`w-full rounded border px-3 py-2 text-sm uppercase outline-none focus:border-primary ${walletErrors.txnId ? "border-destructive bg-destructive/5" : "border-border"}`}
                          />
                          {walletErrors.txnId && <p className="mt-1 text-[11px] text-destructive">{walletErrors.txnId}</p>}
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] text-muted-foreground">Your {PAYMENTS.find(p => p.id === payment)?.label} Number *</label>
                          <input
                            id="field-senderPhone"
                            inputMode="numeric"
                            maxLength={11}
                            value={senderPhone}
                            onChange={(e) => { setSenderPhone(e.target.value.replace(/\D/g, "")); setWalletErrors((er) => ({ ...er, senderPhone: undefined })); }}
                            placeholder="01XXXXXXXXX"
                            className={`w-full rounded border px-3 py-2 text-sm outline-none focus:border-primary ${walletErrors.senderPhone ? "border-destructive bg-destructive/5" : "border-border"}`}
                          />
                          {walletErrors.senderPhone && <p className="mt-1 text-[11px] text-destructive">{walletErrors.senderPhone}</p>}
                        </div>
                      </div>
                      {payOption === "delivery" && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Remaining <span className="font-semibold text-foreground">{formatBDT(Math.max(0, total - shippingFee))}</span> will be collected on delivery.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar Summary */}
            <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
              <section className="rounded bg-card shadow-card">
                <header className="flex items-center justify-between border-b px-4 py-3">
                  <span className="font-semibold">Order Summary</span>
                  <span className="text-xs text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""}</span>
                </header>
                <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
                  <Store className="size-3.5 text-primary" /> Sold & Shipped by <span className="font-semibold text-foreground">Bazar</span>
                </div>
                <div className="max-h-72 divide-y overflow-y-auto">
                  {items.map(({ product: p, qty }) => {
                    const mrp = (p as { mrp?: number }).mrp;
                    return (
                      <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                        <ProductImage src={p.image} alt="" className="size-14 rounded border object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs">{p.title.en}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatBDT(p.price)}{mrp && mrp > p.price && <span className="ml-1 line-through">{formatBDT(mrp)}</span>} × {qty}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-primary">{formatBDT(p.price * qty)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2 border-t px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 rounded bg-success/10 px-2 py-1.5 text-[11px] text-success">
                    <CalendarClock className="size-3.5" /> Estimated Delivery: <span className="font-semibold">{eta}</span>
                  </div>
                  {(() => {
                    const totalQty = items.reduce((s, x) => s + x.qty, 0);
                    const baseShipping = shippingFee;
                    const shipDiscount = 0;
                    const voucherShipOff = discount === shippingFee && shippingFee > 0;
                    const vat = Math.round(subtotal * 0.05);
                    return (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Merchandise Subtotal ({totalQty} item{totalQty > 1 ? "s" : ""})</span><span>{formatBDT(subtotal)}</span></div>
                        {hasRegion ? (
                          <div className="flex justify-between"><span className="text-muted-foreground">Delivery Charge</span><span>{formatBDT(baseShipping)}</span></div>
                        ) : (
                          <div className="flex justify-between"><span className="text-muted-foreground">Delivery Charge</span><span className="text-[11px] text-muted-foreground">Select district</span></div>
                        )}
                        {voucherShipOff && (
                          <div className="flex justify-between text-success"><span>Free Shipping Voucher</span><span>-{formatBDT(shippingFee)}</span></div>
                        )}
                        {discount > 0 && !voucherShipOff && (
                          <div className="flex justify-between text-success"><span>Voucher Discount</span><span>-{formatBDT(discount)}</span></div>
                        )}
                        <div className="mt-2 flex items-center justify-between border-t pt-2">
                          <span className="text-sm font-medium">Total Payment</span>
                          <span className="text-lg font-bold text-primary">{formatBDT(total)}</span>
                        </div>
                        {totalSavings > 0 && (
                          <p className="text-right text-[11px] font-medium text-success">You saved {formatBDT(totalSavings)}</p>
                        )}
                        <div className="flex items-center justify-between rounded bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          <span className="flex items-center gap-1">🪙 Earn Bazar Coins</span>
                          <span className="font-semibold">+{coinsEarn}</span>
                        </div>
                      </>
                    );
                  })()}
                  <p className="text-[11px] text-muted-foreground">Standard Delivery · 3-5 days · Pay by {PAYMENTS.find(p => p.id === payment)?.label}</p>
                  <div className="flex items-center gap-3 border-t pt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Undo2 className="size-3" /> 7 Days Return</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="size-3" /> Buyer Protection</span>
                  </div>
                </div>
                <div className="space-y-2 border-t px-4 py-3">
                  {(hasStockIssue || (stockError && stockError.length > 0)) && (
                    <div role="alert" aria-live="assertive" className="animate-in fade-in rounded-md border-2 border-red-500 bg-red-50 p-3 text-xs text-red-700 shadow-sm">
                      <p className="mb-1 font-extrabold text-red-700">🚫 Order blocked — stock unavailable</p>
                      <ul className="list-disc space-y-0.5 pl-5">
                        {stockError && stockError.length > 0
                          ? stockError.map((line, i) => <li key={i} className="font-semibold">{line}</li>)
                          : stockIssues.map((s) => (
                              <li key={s.pid}>
                                <span className="font-bold">"{s.title}"</span> — {s.kind === "out" ? "Out of Stock" : `only ${s.available} left`}
                              </li>
                            ))}
                      </ul>
                      <p className="mt-2 text-[10px] text-red-600">অনুগ্রহ করে quantity কমান বা কার্ট থেকে remove করে আবার চেষ্টা করুন।</p>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={placing || hasStockIssue}
                    onClick={submit}
                    className="w-full rounded bg-primary py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {placing ? "Placing Order…" : hasStockIssue ? "❌ Out of Stock" : "Place Order"}
                  </button>
                </div>
              </section>
              <div className="rounded bg-card p-3 text-xs shadow-card">
                <p className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-success" /> 100% Authentic · Buyer Protection</p>
                <Link to="/cart" className="mt-2 flex items-center justify-between text-primary">
                  <span>Back to Cart</span><ChevronRight className="size-4" />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
