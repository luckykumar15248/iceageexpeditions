import type { Metadata } from "next";
import Link from "next/link";
import { safetySections } from "@/lib/content";

export const metadata: Metadata = {
  title: "Safety and guidelines",
  description:
    "Altitude illness, Inner Line and Protected Area permits, weather closures, and how support vehicles are used on Ice Age expeditions.",
  alternates: { canonical: "/safety" },
};

export default function SafetyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">Before you go</p>
      <h1 className="mt-3 font-display text-5xl font-bold text-ink sm:text-7xl">Safety and guidelines</h1>
      <p className="mt-5 text-xl leading-relaxed text-muted">
        High roads are serious. These notes are the house rules. They are not a medical or legal opinion, and permit
        practice can change after this page is published.
      </p>
      <div className="mt-12 flex flex-col gap-6">
        {safetySections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-heading`}
            className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]"
          >
            <h2 id={`${section.id}-heading`} className="font-display text-3xl font-bold text-ink sm:text-4xl">
              {section.title}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-lg leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-10 text-lg text-muted">
        Questions about a specific departure belong on that route’s enquiry form. Read the{" "}
        <Link href="/faq" className="font-semibold text-alpine-deep underline">
          FAQ
        </Link>{" "}
        for deposits and cancellations.
      </p>
    </div>
  );
}
