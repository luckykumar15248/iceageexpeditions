import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Ice Age Expeditions, The Era of Trails, runs guided Himalayan 4x4 SUV and motorbike journeys with dated departures.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-base font-semibold tracking-[0.14em] text-alpine uppercase">The Era of Trails</p>
      <h1 className="mt-3 font-display text-5xl font-bold text-ink sm:text-7xl">About Ice Age Expeditions</h1>
      <div className="mt-8 space-y-5 rounded-3xl border border-line bg-paper p-8 text-xl leading-relaxed text-muted shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
        <p>
          Ice Age Expeditions takes small groups into the high Himalaya by 4x4 SUV and by motorbike. The work is the
          road, the night’s altitude, and getting everyone back when the weather turns.
        </p>
        <p>
          A published expedition is a route with a vehicle class, a day-by-day brief, and dated departures. Seats and
          bike slots are counted. When a batch is full, it stays full. Private groups are quoted only after the
          vehicles, guides, and permit window are real.
        </p>
        <p>
          We write the constraints in plain language: acclimatization, support vehicles, and the chance a pass will
          close. The brand is the trailhead briefing, not a resort brochure.
        </p>
      </div>
      <Link
        href="/expeditions"
        className="mt-8 inline-flex min-h-14 items-center rounded-md bg-alpine px-6 text-lg font-semibold text-white hover:bg-alpine-deep"
      >
        Browse expeditions
      </Link>
    </div>
  );
}
