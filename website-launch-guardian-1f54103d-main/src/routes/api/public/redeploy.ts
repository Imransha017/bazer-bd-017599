import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/redeploy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const trigger = process.env.REDEPLOY_TRIGGER_SECRET;
        const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

        if (!hookUrl) {
          return new Response("Deploy hook not configured", { status: 500 });
        }

        // Simple auth so random callers can't spam rebuilds
        const provided =
          request.headers.get("x-trigger-secret") ??
          new URL(request.url).searchParams.get("secret");
        if (!trigger || provided !== trigger) {
          return new Response("Unauthorized", { status: 401 });
        }

        const res = await fetch(hookUrl, { method: "POST" });
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () =>
        new Response("Use POST with x-trigger-secret header", { status: 405 }),
    },
  },
});
