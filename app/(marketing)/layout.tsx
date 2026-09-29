import { JsonLd } from "@/components/marketing/json-ld";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { organizationJsonLd } from "@/lib/site";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-alpine focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
