import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/logout")({
  component: LogoutPage,
});

function LogoutPage() {
  const { signOut } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    (async () => {
      await signOut();
      nav({ to: "/", replace: true });
    })();
  }, [signOut, nav]);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Signing out…
    </div>
  );
}
