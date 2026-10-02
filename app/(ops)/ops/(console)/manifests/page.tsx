import type { Metadata } from "next";
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame";
import { departureStatusLabel, formatDepartureDate } from "@/lib/format";
import { loadOpsManifests } from "@/lib/ops-dashboard";
import type { DepartureStatus } from "@/app/generated/prisma/client";

export const metadata: Metadata = { title: "Passenger manifests" };

export default async function OpsManifestsPage() {
  const snapshot = await loadOpsManifests();
  return (
    <>
      <OpsHeading
        kicker="On the road"
        title="Passenger manifests"
        body="Lead names and party size for departures that have a booking. Phone numbers, emergency contacts, and fitness notes stay off this list."
      />
      {snapshot.data === "offline" ? (
        <OpsOffline />
      ) : snapshot.data.length === 0 ? (
        <p className="mt-10 text-base leading-relaxed text-muted">No bookings are on a manifest yet.</p>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
          <table className="w-full min-w-[44rem] text-left text-base">
            <thead>
              <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-6 py-4 font-semibold">Departure</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Party</th>
                <th className="px-6 py-4 font-semibold">Lead</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.data.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-4 font-semibold text-ink">{row.title}</td>
                  <td className="px-6 py-4 text-ink">{formatDepartureDate(new Date(row.startDate))}</td>
                  <td className="px-6 py-4 text-ink">
                    {row.partySize} · {departureStatusLabel(row.status as DepartureStatus)}
                  </td>
                  <td className="px-6 py-4 text-ink">{row.leads.length > 0 ? row.leads.join(", ") : "Lead name missing"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
