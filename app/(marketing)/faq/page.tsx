import type { Metadata } from "next";
import { JsonLd } from "@/components/marketing/json-ld";
import { faqItems } from "@/lib/content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers on booking requests, deposits, full departures, road closures, and private groups.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
      <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">Help</p>
      <h1 className="mt-3 font-display text-5xl font-bold text-ink sm:text-7xl">FAQ</h1>
      <div className="mt-12 flex flex-col gap-5">
        {faqItems.map((item) => (
          <section key={item.question} className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
            <h2 className="font-display text-3xl font-bold text-ink">{item.question}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">{item.answer}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
