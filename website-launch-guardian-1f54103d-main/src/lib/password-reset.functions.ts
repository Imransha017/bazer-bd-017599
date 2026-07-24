import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const phoneRe = /^01[3-9]\d{8}$/;

const requestSchema = z.object({
  method: z.enum(["phone", "email"]),
  identifier: z.string().trim().min(3).max(120),
  newPassword: z.string().min(6).max(72),
});

/** Public: user submits a phone/email + desired new password. Stored pending. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let identifier = data.identifier.trim();
    let lookupEmail = identifier;
    if (data.method === "phone") {
      const digits = identifier.replace(/\D/g, "");
      if (!phoneRe.test(digits)) throw new Error("সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)");
      identifier = digits;
      lookupEmail = `${digits}@phone.bazar.bd`;
    } else {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier)) throw new Error("সঠিক ইমেইল দিন");
    }

    // Find the auth user (paged listUsers).
    let foundId: string | null = null;
    let page = 1;
    while (page <= 20 && !foundId) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const u = list.users.find((x) => (x.email ?? "").toLowerCase() === lookupEmail.toLowerCase());
      if (u) foundId = u.id;
      if (list.users.length < 200) break;
      page++;
    }
    if (!foundId) throw new Error(
      data.method === "phone"
        ? "এই নম্বরে কোনো একাউন্ট পাওয়া যায়নি"
        : "এই ইমেইলে কোনো একাউন্ট পাওয়া যায়নি",
    );

    // Rate-limit: max 3 pending per identifier.
    const { data: pending } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id")
      .eq("identifier", identifier)
      .eq("status", "pending");
    if ((pending?.length ?? 0) >= 3) {
      throw new Error("আপনার একাধিক রিকোয়েস্ট পেন্ডিং আছে — অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করুন");
    }

    // Store the desired new password (base64 obfuscation only; admin flow overwrites via admin API).
    const hash = Buffer.from(data.newPassword, "utf8").toString("base64");

    const { error: insErr } = await supabaseAdmin.from("password_reset_requests").insert({
      identifier,
      method: data.method,
      user_id: foundId,
      new_password_hash: hash,
      status: "pending",
    });
    if (insErr) throw new Error(insErr.message);

    return { ok: true };
  });

const statusSchema = z.object({
  method: z.enum(["phone", "email"]),
  identifier: z.string().trim().min(3).max(120),
});

/** Public: check latest reset request status for a phone/email. Returns no secrets. */
export const checkPasswordResetStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => statusSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let identifier = data.identifier.trim();
    if (data.method === "phone") {
      const digits = identifier.replace(/\D/g, "");
      if (!phoneRe.test(digits)) throw new Error("সঠিক বাংলাদেশি নম্বর দিন");
      identifier = digits;
    }
    const { data: rows, error } = await supabaseAdmin
      .from("password_reset_requests")
      .select("id, status, admin_note, created_at, reviewed_at")
      .eq("identifier", identifier)
      .eq("method", data.method)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    return { requests: rows ?? [] };
  });

const reviewSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

/** Admin only: approve → sets new password via admin API. Reject → mark rejected. */
export const reviewPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reviewSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: rErr } = await supabaseAdmin
      .from("password_reset_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("Request not found");
    if (row.status !== "pending") throw new Error("Already reviewed");

    if (data.action === "reject") {
      const { error } = await supabaseAdmin.from("password_reset_requests").update({
        status: "rejected",
        admin_note: data.note ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, action: "reject" as const };
    }

    // Approve → actually update the user's password.
    if (!row.user_id) throw new Error("User missing");
    const newPass = Buffer.from(row.new_password_hash, "base64").toString("utf8");
    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      password: newPass,
    });
    if (upErr) throw new Error(upErr.message);

    const { error } = await supabaseAdmin.from("password_reset_requests").update({
      status: "used",
      admin_note: data.note ?? null,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
      new_password_hash: "", // clear the stored password
    }).eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true, action: "approve" as const };
  });
