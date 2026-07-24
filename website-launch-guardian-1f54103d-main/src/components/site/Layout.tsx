import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileNav } from "./MobileNav";
import { PromotionsTopBar } from "./Promotions";

export function SiteLayout({ children, footer }: { children: ReactNode; footer?: ReactNode | false }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PromotionsTopBar />
      <Header />
      <main className="flex-1 pb-20 md:pb-4">{children}</main>
      {footer === false ? null : footer ?? <Footer />}
      <MobileNav />
    </div>
  );
}
