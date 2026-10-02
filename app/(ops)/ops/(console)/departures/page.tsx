import type { Metadata } from "next";
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame";
import { departureStatusLabel, formatDepartureDate, formatInr, inventoryNoun, vehicleLabel } from "@/lib/format";
import { loadOpsDepartures } from "@/lib/ops-dashboard";
import type { DepartureStatus, VehicleClass } from "@/app/generated/prisma/client";

export const metadata: Metadata = { title: "Departures" };

export default async function OpsDeparturesPage() {
  const snapshot = await loadOpsDepartures();
  return (
    <>
      <OpsHeading
        kicker="Dates"
        title="Departures"
        body="Open, full, and closed batches. A full batch stays visible and is not bookable. Seat counts are the inventory still held in the database."
      />
      {snapshot.data === "offline" ? (
        <OpsOffline />
      ) : snapshot.data.length === 0 ? (
        <p className="mt-10 text-base leading-relaxed text-muted">No open, full, or closed departures are stored yet.</p>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
          <table className="w-full min-w-[52rem] text-left text-base">
            <thead>
              <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-6 py-4 font-semibold">Departure</th>
                <th className="px-6 py-4 font-semibold">Dates</th>
                <th className="px-6 py-4 font-semibold">Places</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.data.map((row) => {
                const vehicle = row.vehicleClass as VehicleClass;
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-ink">{row.title}</p>
                      <p className="text-muted">{vehicleLabel(vehicle)}</p>
                    </td>
                    <td className="px-6 py-4 text-ink">
                      {formatDepartureDate(new Date(row.startDate))} – {formatDepartureDate(new Date(row.endDate))}
                    </td>
                    <td className="px-6 py-4 text-ink">
                      {row.seatsRemaining} of {row.capacity} {inventoryNoun(vehicle, row.capacity)}
                    </td>
                    <td className="px-6 py-4 text-ink">{formatInr(row.pricePaisa)}</td>
                    <td className="px-6 py-4 text-ink">{departureStatusLabel(row.status as DepartureStatus)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
