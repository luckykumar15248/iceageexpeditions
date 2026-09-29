import type { Metadata } from "next";
import Link from "next/link";
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame";
import { vehicleLabel } from "@/lib/format";
import { loadOpsExpeditions } from "@/lib/ops-dashboard";
import { StaffPermission, staffHasPermission } from "@/lib/staff";
import type { VehicleClass } from "@/app/generated/prisma/client";

export const metadata: Metadata = { title: "Expeditions" };

export default async function OpsExpeditionsPage() {
  const snapshot = await loadOpsExpeditions();
  const canWrite = staffHasPermission(snapshot.staff.role, StaffPermission.catalogWrite);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <OpsHeading
          kicker="Route book"
          title="Expeditions"
          body="Draft and published routes. A published route is visible. A departure becomes bookable only when it is open, dated, priced, and has a meeting point and cancellation terms."
        />
        {canWrite ? (
          <Link href="/ops/expeditions/new" className="inline-flex min-h-14 items-center rounded-md bg-alpine px-6 text-lg font-semibold text-white hover:bg-alpine-deep">
            New expedition
          </Link>
        ) : null}
      </div>
      {snapshot.data === "offline" ? (
        <OpsOffline />
      ) : snapshot.data.length === 0 ? (
        <p className="mt-10 text-lg text-muted">No expeditions are stored yet.</p>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
          <table className="w-full min-w-[44rem] text-left text-lg">
            <thead>
              <tr className="border-b border-line text-base uppercase tracking-wide text-muted">
                <th className="px-6 py-4 font-semibold">Route</th>
                <th className="px-6 py-4 font-semibold">Vehicle</th>
                <th className="px-6 py-4 font-semibold">Season</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Record</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.data.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-ink">{row.title}</p>
                    <p className="text-muted">{row.regionName}</p>
                  </td>
                  <td className="px-6 py-4 text-ink">{vehicleLabel(row.vehicleClass as VehicleClass)}</td>
                  <td className="px-6 py-4 text-ink">{row.seasonLabel}</td>
                  <td className="px-6 py-4 text-ink">{row.status}</td>
                  <td className="px-6 py-4">
                    <Link href={`/ops/expeditions/${row.id}`} className="font-semibold text-alpine-deep underline-offset-4 hover:underline">
                      {canWrite ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
