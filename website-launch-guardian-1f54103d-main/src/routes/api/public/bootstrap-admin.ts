import { createFileRoute } from "@tanstack/react-router";

const TARGET_EMAIL = "emransha952@gmail.com";
const TARGET_PASSWORD = "Emran017599@#&*";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find existing user
        let userId: string | null = null;
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listErr) return json({ ok: false, step: "list", error: listErr.message }, 500);
        const existing = list.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL);

        if (existing) {
          userId = existing.id;
          // Reset password + confirm email
          const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: TARGET_PASSWORD,
            email_confirm: true,
          });
          if (updErr) return json({ ok: false, step: "update", error: updErr.message }, 500);
        } else {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: TARGET_EMAIL,
            password: TARGET_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: "Emran" },
          });
          if (createErr) return json({ ok: false, step: "create", error: createErr.message }, 500);
          userId = created.user!.id;
        }

        // Ensure admin role
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId!, role: "admin" }, { onConflict: "user_id,role" });
        if (roleErr) return json({ ok: false, step: "role", error: roleErr.message }, 500);

        // Ensure profile
        await supabaseAdmin
          .from("profiles")
          .upsert({ id: userId!, full_name: "Emran" }, { onConflict: "id" });

        return json({
          ok: true,
          message: "Admin account ready. Login at /auth then visit /sys-x7k9-control",
          email: TARGET_EMAIL,
        });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
