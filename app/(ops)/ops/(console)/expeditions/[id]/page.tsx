import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpeditionEditor } from "@/components/ops/expedition-editor";
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame";
import { loadCmsExpedition } from "@/lib/cms";
import { formatInr } from "@/lib/format";
import { requireOpsStaff } from "@/lib/ops-auth";
import { StaffPermission, staffHasPermission } from "@/lib/staff";

export const metadata: Metadata = { title: "Edit expedition" };

export default async function EditExpeditionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; departure?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const staff = await requireOpsStaff();
  const record = await loadCmsExpedition(id);
  if (record === "offline") {
    return (
      <>
        <OpsHeading kicker="Route book" title="Expedition" body="The route record could not be loaded." />
        <OpsOffline />
      </>
    );
  }
  if (!record) notFound();
  const canWrite = staffHasPermission(staff.role, StaffPermission.catalogWrite);
  const notice = query.saved === "1" ? "Expedition saved." : query.departure === "1" ? "Departure added. Remaining places match the capacity you entered." : "";

  return (
    <>
      <OpsHeading
        kicker="Route book"
        title={record.title}
        body={`${record.status} · ${record.regionName} · ${record.slug}. Basics, itinerary, departures, and search each have their own step.`}
      />
      <p className="mt-6">
        <Link href="/ops/expeditions" className="text-base font-medium text-alpine-deep underline-offset-4 hover:underline">
          Back to expeditions
        </Link>
      </p>
      {notice ? <p className="mt-6 rounded-2xl border border-line bg-alpine-soft px-4 py-3 text-base text-ink">{notice}</p> : null}
      {canWrite ? (
        <ExpeditionEditor expedition={record} />
      ) : (
        <>
          <ReadOnlyExpedition expedition={record} />
          <section className="mt-12" aria-labelledby="batches-heading">
            <h2 id="batches-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Departures
            </h2>
            {record.departures.length === 0 ? (
              <p className="mt-4 text-base leading-relaxed text-muted">No dated batches are stored for this route.</p>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-paper">
                <table className="w-full min-w-[48rem] text-left text-base">
                  <thead>
                    <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-muted">
                      <th className="px-6 py-4 font-semibold">Dates</th>
                      <th className="px-6 py-4 font-semibold">Meeting point</th>
                      <th className="px-6 py-4 font-semibold">Open</th>
                      <th className="px-6 py-4 font-semibold">Price</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.departures.map((departure) => (
                      <tr key={departure.id} className="border-b border-line last:border-0">
                        <td className="px-6 py-4 text-ink">
                          {departure.startDate} – {departure.endDate}
                        </td>
                        <td className="px-6 py-4 text-ink">{departure.meetingPoint}</td>
                        <td className="px-6 py-4 text-ink">
                          {departure.seatsRemaining} of {departure.capacity}
                        </td>
                        <td className="px-6 py-4 text-ink">
                          {formatInr(departure.pricePaisa)}
                          <span className="block text-base text-muted">Deposit {formatInr(departure.depositPaisa)}</span>
                        </td>
                        <td className="px-6 py-4 text-ink">{departure.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function ReadOnlyExpedition({
  expedition,
}: {
  expedition: {
    summary: string;
    seasonLabel: string;
    durationDays: number;
    maxAltitudeMeters: number;
    difficulty: string;
    days: { dayNumber: number; title: string; sleepStop: string }[];
  };
}) {
  return (
    <section className="mt-10 rounded-3xl border border-line bg-paper p-8">
      <p className="text-base leading-relaxed text-muted">This desk role can read the route. Changing it needs an ops admin or expedition lead.</p>
      <p className="mt-6 text-base text-ink">{expedition.summary}</p>
      <p className="mt-4 text-base text-ink">
        {expedition.durationDays} days · {expedition.maxAltitudeMeters} m · {expedition.difficulty} · {expedition.seasonLabel}
      </p>
      <ul className="mt-6 grid gap-3">
        {expedition.days.map((day) => (
          <li key={day.dayNumber} className="text-base text-ink">
            Day {day.dayNumber}: {day.title} · sleep {day.sleepStop}
          </li>
        ))}
      </ul>
    </section>
  );
}
