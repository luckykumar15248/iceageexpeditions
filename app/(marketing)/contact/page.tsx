import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/marketing/enquiry-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Ice Age Expeditions desk at Kullu and Bhuntar before a high-road departure.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">The desk</p>
      <h1 className="mt-3 font-display text-5xl font-bold text-ink sm:text-7xl">Contact</h1>
      <p className="mt-5 max-w-3xl text-xl leading-relaxed text-muted">
        Groups meet the crew in the Kullu and Bhuntar valley before the high road. A direct phone number and email are
        given with your departure, not published here.
      </p>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
          <h2 className="font-display text-3xl font-bold text-ink">Base camp</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Kullu / Bhuntar, Himachal Pradesh. This is the valley desk for briefings and vehicle handover. It is not a
            street address you can navigate to without ops.
          </p>
        </article>
        <article className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
          <h2 className="font-display text-3xl font-bold text-ink">Enquiry line</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Use the form. Ops replies with the phone and email for your file. Do not treat a guessed number as the
            company line.
          </p>
          <Link href="/enquire" className="mt-5 inline-flex text-lg font-semibold text-alpine-deep hover:underline">
            Open the enquiry form
          </Link>
        </article>
        <article className="rounded-3xl border border-line border-l-4 border-l-alpine bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
          <h2 className="font-display text-3xl font-bold text-ink">Emergency support</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            On an open departure, the emergency number is the one ops gives you before you leave Bhuntar. This page is
            not a rescue line, and it does not replace local emergency services.
          </p>
        </article>
      </div>
      <div className="mt-12 max-w-3xl">
        <EnquiryForm heading="Write to the desk" />
      </div>
    </div>
  );
}
