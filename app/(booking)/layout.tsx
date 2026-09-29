import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function BookingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
