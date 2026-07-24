import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Tracks pending phone password-reset requests in real time.
 * - Returns live pending count for the sidebar badge.
 * - Optionally shows a toast when a brand-new pending request arrives.
 * - `bumpKey` increments every time realtime signals a change, so
 *   consumer pages can refetch their own rows.
 */
export function usePendingResets(opts: { notify?: boolean } = {}) {
  const { notify = false } = opts;
  const [count, setCount] = useState<number>(0);
  const [bumpKey, setBumpKey] = useState(0);
  const mounted = useRef(true);

  async function refreshCount() {
    const { count: c } = await supabase
      .from("password_reset_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (mounted.current && typeof c === "number") setCount(c);
  }

  useEffect(() => {
    mounted.current = true;
    refreshCount();

    const channel = supabase
      .channel("admin-password-resets")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "password_reset_requests" },
        (payload) => {
          const row = payload.new as { identifier?: string; method?: string; status?: string };
          if (row?.status === "pending" && notify) {
            toast.info("🔔 নতুন পাসওয়ার্ড রিসেট রিকোয়েস্ট", {
              description: `${row.method === "phone" ? "📱" : "📧"} ${row.identifier ?? ""}`,
              duration: 8000,
            });
            try {
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                new Notification("নতুন পাসওয়ার্ড রিসেট রিকোয়েস্ট", {
                  body: `${row.method}: ${row.identifier ?? ""}`,
                });
              }
            } catch { /* ignore */ }
          }
          refreshCount();
          setBumpKey((k) => k + 1);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "password_reset_requests" },
        () => {
          refreshCount();
          setBumpKey((k) => k + 1);
        },
      )
      .subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify]);

  return { pendingCount: count, bumpKey, refreshCount };
}
