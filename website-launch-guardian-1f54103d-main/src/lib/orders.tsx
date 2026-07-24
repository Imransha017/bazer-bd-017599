import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "./cart";

export type ShippingAddress = {
  fullName: string;
  phone: string;
  region: string;
  city: string;
  
  address: string;
};

export type PaymentMethod = "cod" | "card" | "bkash" | "nagad" | "rocket";

export type WalletPaymentInfo = {
  type: "full" | "delivery";
  amountPaid: number;
  transactionId: string;
  senderPhone: string;
};

export type Order = {
  id: string;
  createdAt: number;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  address: ShippingAddress;
  payment: PaymentMethod;
  walletInfo?: WalletPaymentInfo;
  status: "Pending" | "Packed" | "Shipped" | "Delivered" | "Cancelled";
  dbOrderNumbers?: string[];
};

type Ctx = {
  orders: Order[];
  placeOrder: (o: Omit<Order, "id" | "createdAt" | "status">) => Order;
  getOrder: (id: string) => Order | undefined;
  cancelOrder: (id: string) => void;
};

const OrdersCtx = createContext<Ctx | null>(null);
const KEY = "bazar_orders_v1";

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setOrders(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(orders));
  }, [orders]);

  const placeOrder: Ctx["placeOrder"] = (o) => {
    const order: Order = {
      ...o,
      id: "DRZ" + Date.now().toString().slice(-9),
      createdAt: Date.now(),
      status: "Pending",
    };
    setOrders((curr) => [order, ...curr]);
    // Fire-and-forget sync to admin database — split per vendor
    import("@/lib/admin-api").then(async ({ createDBOrder, getProductVendorMap }) => {
      const map = await getProductVendorMap(o.items.map(i => i.product.id));
      const groups = new Map<string | null, typeof o.items>();
      for (const it of o.items) {
        const vid = map[it.product.id] ?? null;
        if (!groups.has(vid)) groups.set(vid, []);
        groups.get(vid)!.push(it);
      }
      const totalQty = o.items.reduce((s, i) => s + i.qty, 0);
      const { getRefCode, getRefProduct, attributeOrder, clearRefCode } = await import("@/lib/affiliate");
      const { getDsCode, attributeOrderToDs, clearDsCode } = await import("@/lib/dropshipper");
      const refCode = getRefCode();
      const refProduct = getRefProduct();
      const dsCode = getDsCode();
      // Fetch base prices for dropshipper attribution (retail = cart line price, base = product.price from DB)
      let basePriceMap = new Map<string, number>();
      if (dsCode) {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const ids = o.items.map(i => i.product.id);
          const { data } = await supabase.from("products").select("id,price").in("id", ids);
          basePriceMap = new Map((data ?? []).map((r: { id: string; price: number }) => [r.id, Number(r.price)]));
        } catch { /* ignore */ }
      }
      const dbNumbers: string[] = [];
      for (const [vendor_id, items] of groups) {
        const sub = items.reduce((s, i) => s + i.product.price * i.qty, 0);
        const ratio = totalQty ? items.reduce((s, i) => s + i.qty, 0) / totalQty : 0;
        const fee = +(o.shippingFee * ratio).toFixed(2);
        try {
          const row = await createDBOrder({
            customer_name: o.address.fullName,
            customer_phone: o.address.phone,
            address: o.address.address,
            district: o.address.region,
            thana: o.address.city,
            items: items.map((it) => ({
              id: it.product.id, name: it.product.title.en,
              price: it.product.price, qty: it.qty, image: it.product.image,
            })),
            subtotal: sub,
            delivery_fee: fee,
            total: +(sub + fee).toFixed(2),
            payment_method: o.payment,
            payment_type: o.walletInfo?.type,
            txn_id: o.walletInfo?.transactionId,
            sender_phone: o.walletInfo?.senderPhone,
            paid_amount: o.walletInfo?.amountPaid,
            vendor_id,
          });
          if (row?.order_number) dbNumbers.push(row.order_number);
          if (refCode && row?.id) {
            const pid = refProduct && items.some(it => it.product.id === refProduct) ? refProduct : null;
            await attributeOrder(row.id, refCode, pid);
          }
          if (dsCode && row?.id) {
            const lines = items.map(it => ({
              product_id: it.product.id,
              base_price: basePriceMap.get(it.product.id) ?? it.product.price,
              retail_price: it.product.price,
              qty: it.qty,
            }));
            await attributeOrderToDs(row.id, dsCode, lines);
          }
        } catch { /* ignore */ }
      }
      if (dbNumbers.length) {
        setOrders((curr) => curr.map((x) => x.id === order.id ? { ...x, dbOrderNumbers: dbNumbers } : x));
        try {
          const { sendOrderSMS } = await import("@/lib/sms.functions");
          await sendOrderSMS({ data: { phone: o.address.phone, orderNumber: dbNumbers[0], total: o.total } });
        } catch { /* ignore */ }
      }
      if (refCode) clearRefCode();
      if (dsCode) clearDsCode();

    });
    return order;
  };
  const getOrder = (id: string) => orders.find((x) => x.id === id);
  const cancelOrder = (id: string) =>
    setOrders((curr) => curr.map((o) => (o.id === id ? { ...o, status: "Cancelled" } : o)));

  return (
    <OrdersCtx.Provider value={{ orders, placeOrder, getOrder, cancelOrder }}>
      {children}
    </OrdersCtx.Provider>
  );
}

export function useOrders() {
  const c = useContext(OrdersCtx);
  if (!c) throw new Error("useOrders must be inside OrdersProvider");
  return c;
}
