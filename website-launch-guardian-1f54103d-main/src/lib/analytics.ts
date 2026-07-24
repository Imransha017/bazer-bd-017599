import { supabase } from "@/integrations/supabase/client";

export async function logEvent(event_name: string, props: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event_name,
      user_id: user?.id ?? null,
      props: props as never,
    });
  } catch {
    // best-effort; never break UX
  }
}
