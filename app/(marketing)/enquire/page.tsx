import type { Metadata } from "next";
import { EnquiryForm } from "@/components/marketing/enquiry-form";
import { corridors } from "@/lib/content";

export const metadata: Metadata = {
  title: "Enquire",
  description: "Ask Ice Age Expeditions about a 4x4 SUV or motorbike departure. A request is not a confirmed seat.",
  alternates: { canonical: "/enquire" },
};

export default async function EnquirePage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string; vehicle?: string; season?: string; email?: string }>;
}) {
  const params = await searchParams;
  const interest = typeof params.interest === "string" ? params.interest : "";
  const season = typeof params.season === "string" ? params.season.trim() : "";
  const vehicle = params.vehicle === "SUV_4X4" || params.vehicle === "MOTORBIKE" ? params.vehicle : "";
  const rawEmail = typeof params.email === "string" ? params.email.trim() : "";
  const email = rawEmail.includes("@") && rawEmail.length <= 200 ? rawEmail : "";
  const dispatch = interest === "dispatches";
  const corridor = corridors.find((item) => item.id === interest);
  const defaultMessage = dispatch
    ? "Please send expedition dispatches and notes when a season opens."
    : [
        corridor ? `I want to ask about ${corridor.title}.` : interest === "private" ? "I want a custom private group." : "",
        season ? `Season in mind: ${season}.` : "",
      ]
        .filter((line) => line.length > 0)
        .join(" ");

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <aside className="rounded-3xl border border-line border-l-4 border-l-alpine bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-alpine uppercase">The Era of Trails</p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">Request a quote</h1>
        <p className="mt-5 text-base leading-relaxed text-muted">
          Tell us the vehicle, the month, and how the group travels. Ops replies with a date only when seats, a guide,
          and the permit window are real.
        </p>
        <ul className="mt-6 space-y-3 text-base text-ink">
          <li>4x4 SUV seats and motorbike slots are different requests.</li>
          <li>A fitness note is a self-declaration, not a doctor’s clearance.</li>
          <li>Sending this form does not capture a payment or hold a seat.</li>
        </ul>
        {dispatch ? (
          <p className="mt-6 rounded-2xl bg-alpine-soft p-5 text-base text-ink">
            You asked for expedition dispatches. Add your name and phone so the desk can reply. This does not start a
            mailing list.
          </p>
        ) : corridor ? (
          <p className="mt-6 rounded-2xl bg-alpine-soft p-5 text-base text-ink">
            You asked about <span className="font-semibold">{corridor.title}</span>. {corridor.body}
          </p>
        ) : null}
      </aside>
      <EnquiryForm
        conversion
        heading={dispatch ? "Seasonal opening notes" : corridor ? `Ask about ${corridor.title}` : "Traveler details"}
        defaultMessage={defaultMessage}
        defaultVehicle={vehicle}
        defaultEmail={email}
      />
    </div>
  );
}
