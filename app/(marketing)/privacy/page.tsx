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
          The enquiry and booking forms use Google reCAPTCHA to keep automated spam out. Google receives your
          browser and device details when you complete that check, under the{" "}
          <a href="https://policies.google.com/privacy" className="font-semibold text-alpine-deep underline" rel="noopener noreferrer" target="_blank">
            Google Privacy Policy
          </a>{" "}
          and{" "}
          <a href="https://policies.google.com/terms" className="font-semibold text-alpine-deep underline" rel="noopener noreferrer" target="_blank">
            Terms of Service
          </a>
          . The blog comment form uses the same check.
        </p>
        <p>
          Blog comments store the name, email address, and comment you submit, plus a one-way hash of your network
          address used only to slow down spam. Your name and comment appear on the article after the team approves
          them. Your email is never published; staff may use it to reply privately.
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
