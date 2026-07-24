import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { OrdersProvider } from "@/lib/orders";
import { AuthProvider } from "@/lib/auth";
import { WishlistProvider } from "@/lib/wishlist";
import { Toaster } from "sonner";

import { AffiliateRefCapture } from "@/components/AffiliateRefCapture";
import { DropshipperRefCapture } from "@/components/DropshipperRefCapture";


function NotFoundComponent() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  }, []);
  return null;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) => {
    // Prefetch (non-blocking) so the header CategoryBar/menu has data instantly
    // on the first navigation and is cached across route changes.
    void import("@/lib/live-catalog").then(({ liveCatalogQueryOptions }) =>
      context.queryClient.prefetchQuery(liveCatalogQueryOptions()),
    );
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bazar BD" },
      { name: "description", content: "Clone My Site creates a website mirroring a provided URL's design and features." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Bazar BD" },
      { property: "og:description", content: "Clone My Site creates a website mirroring a provided URL's design and features." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Bazar BD" },
      { name: "twitter:description", content: "Clone My Site creates a website mirroring a provided URL's design and features." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7add2e7d-10e5-4779-b11b-f68a86994746/id-preview-ea4b1e0e--9ba97df9-8409-4f69-a5d5-d9436227f3da.lovable.app-1782844526156.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7add2e7d-10e5-4779-b11b-f68a86994746/id-preview-ea4b1e0e--9ba97df9-8409-4f69-a5d5-d9436227f3da.lovable.app-1782844526156.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <CartProvider>
            <WishlistProvider>
              <OrdersProvider>
                <Outlet />
                <AffiliateRefCapture />
                <DropshipperRefCapture />

                <Toaster position="top-center" richColors />
                
              </OrdersProvider>
            </WishlistProvider>
          </CartProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
