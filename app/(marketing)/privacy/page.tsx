import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Ice Age Expeditions collects on an enquiry or booking request, and how to ask about it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold tracking-wide text-alpine uppercase">Trust</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">Privacy policy</h1>
      <div className="mt-8 space-y-5 rounded-3xl border border-line bg-paper p-8 text-base leading-relaxed text-muted shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-10">
        <p>
          Enquiry and booking forms collect the name, email, phone, party size, vehicle class, and the message you
          write. A booking request also collects an emergency contact, riding experience where it applies, and a fitness
          self-declaration. That note is not a medical record from a doctor.
        </p>
        <p>
          Ops uses those details to answer the request, hold a place only after acceptance, and reach the party about
          the departure. The site does not sell this information, and it does not publish a public phone or email in
          place of the one on your file.
        </p>
        <p>
          To ask what is stored on a request, use the{" "}
          <Link href="/contact" className="font-semibold text-alpine-deep underline">
            contact form
          </Link>
          . A guessed inbox is not a privacy contact.
        </p>
      </div>
    </div>
  );
}
