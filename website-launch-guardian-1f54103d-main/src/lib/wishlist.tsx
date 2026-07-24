import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Ctx = {
  ids: Set<string>;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  count: number;
};

const WishCtx = createContext<Ctx | null>(null);
const KEY = "bazar_wishlist_v1";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());

  // Load: guest from localStorage, signed-in from DB (and sync local→DB)
  useEffect(() => {
    if (!user) {
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
        if (raw) setIds(new Set(JSON.parse(raw)));
        else setIds(new Set());
      } catch { setIds(new Set()); }
      return;
    }
    (async () => {
      // push any guest wishlist to DB
      try {
        const raw = localStorage.getItem(KEY);
        const local: string[] = raw ? JSON.parse(raw) : [];
        if (local.length) {
          await supabase.from("wishlists").upsert(
            local.map((product_id) => ({ user_id: user.id, product_id })),
            { onConflict: "user_id,product_id" },
          );
          localStorage.removeItem(KEY);
        }
      } catch {}
      const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", user.id);
      setIds(new Set((data ?? []).map((r) => r.product_id)));
    })();
  }, [user]);

  useEffect(() => {
    if (!user && typeof window !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(Array.from(ids)));
    }
  }, [ids, user]);

  const has = (id: string) => ids.has(id);

  const toggle = async (productId: string) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    if (ids.has(productId)) {
      setIds((s) => { const n = new Set(s); n.delete(productId); return n; });
      if (user && isUuid) await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
      toast.success("Removed from wishlist");
    } else {
      setIds((s) => new Set(s).add(productId));
      if (user && isUuid) {
        const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
        if (error && !error.message.includes("duplicate")) toast.error(error.message);
      }
      toast.success("Added to wishlist ❤️");
    }
  };

  const remove = async (productId: string) => {
    setIds((s) => { const n = new Set(s); n.delete(productId); return n; });
    if (user) await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
  };

  return (
    <WishCtx.Provider value={{ ids, has, toggle, remove, count: ids.size }}>{children}</WishCtx.Provider>
  );
}

export function useWishlist() {
  const c = useContext(WishCtx);
  if (!c) throw new Error("useWishlist must be inside WishlistProvider");
  return c;
}
