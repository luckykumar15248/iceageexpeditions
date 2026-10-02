import type { Metadata } from "next";
import { riderGear, suvGear } from "@/lib/content";

export const metadata: Metadata = {
  title: "Gear and packing",
  description: "Packing lists for Himalayan motorbike riders and 4x4 SUV travelers on Ice Age Expeditions.",
  alternates: { canonical: "/gear" },
};

export default function GearPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold tracking-wide text-alpine uppercase">What comes with you</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">Gear and packing</h1>
      <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted">
        Pack for cold nights and bright snow, even when the valley you leave is hot. Soft bags pack better than hard
        cases.
      </p>
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <GearColumn title="Motorbike riders" groups={[["On the bike", riderGear.ride], ["In camp", riderGear.camp]]} />
        <GearColumn title="4x4 SUV travelers" groups={[["In the vehicle", suvGear.drive], ["In camp", suvGear.camp]]} />
      </div>
    </div>
  );
}

function GearColumn({
  title,
  groups,
}: {
  title: string;
  groups: readonly (readonly [string, readonly string[]])[];
}) {
  return (
    <section className="rounded-3xl border border-line bg-paper p-8 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {groups.map(([label, items]) => (
        <div key={label} className="mt-8">
          <h3 className="text-base font-semibold tracking-[0.12em] text-alpine uppercase">{label}</h3>
          <ul className="mt-4 list-disc space-y-3 pl-6 text-base leading-relaxed text-muted">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
