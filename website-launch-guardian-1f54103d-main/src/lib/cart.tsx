import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Product } from "./data";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = { product: Product; qty: number };
type Ctx = {
  items: CartItem[];
  add: (p: Product, qty?: number, opts?: { silent?: boolean }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};
const CartCtx = createContext<Ctx | null>(null);

const GUEST_KEY = "bazar_cart_guest";
const keyFor = (uid: string | null) => (uid ? `bazar_cart_u_${uid}` : GUEST_KEY);

function readCart(uid: string | null): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyFor(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  // Track auth user; load that user's cart on change
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      setItems(readCart(uid));
      hydrated.current = true;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setItems(readCart(uid));
      hydrated.current = true;
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Persist only after hydration so we don't overwrite with empty []
  useEffect(() => {
    if (!hydrated.current || typeof window === "undefined") return;
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(items));
    } catch {}
  }, [items, userId]);

  const add = (p: Product, qty = 1, opts?: { silent?: boolean }) => {
    setItems((curr) => {
      const i = curr.findIndex((c) => c.product.id === p.id);
      if (i >= 0) {
        const next = [...curr];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...curr, { product: p, qty }];
    });
    if (!opts?.silent) toast.success("Added to cart");
  };
  const remove = (id: string) => setItems((c) => c.filter((x) => x.product.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((c) => c.map((x) => (x.product.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  const clear = () => setItems([]);

  const count = items.reduce((s, x) => s + x.qty, 0);
  const subtotal = items.reduce((s, x) => s + x.product.price * x.qty, 0);

  return (
    <CartCtx.Provider value={{ items, add, remove, setQty, clear, count, subtotal }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
